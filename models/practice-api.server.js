/**
 * User: ma
 * Date: 15/07/2014  13:25
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'practice-api', function( Y, NAME ) {
        const
            {formatPromiseResult} = require( 'dc-core' ).utils;

        let
            myCache; //eslint-disable-line no-unused-vars

        // called on master, per tenant
        function initPractice( user, callback ) {
            let
                myCache = Y.doccirrus.cache.getCacheBase( { customerID_Table: null } ); // workers will get it from master

            callback = callback || function() {
                };
            Y.log( `init practice-api for tenant: ${user.tenantId}`, 'info', NAME );
            Y.doccirrus.api.practice.getMyPractice( user, function( err, myPrac ) {
                if( err ) {
                    Y.log( `initPractice: DB Error getting my practice.`, 'warn', NAME );
                    return callback( err );
                }
                myCache.customerID_Table = myCache.customerID_Table || {};
                myCache.customerID_Table[user.tenantId] = myPrac && myPrac.dcCustomerNo;
                myCache.customerID_Table = myCache.customerID_Table;

                // short circuit after filling my cache
                callback();  /*eslint-disable-line callback-return*/

                // then continue with the registration, which is fail-safe via ensure delivery.
                if( myPrac.hasOwnProperty( 'onlyPracticesPatientsCanBook' ) && !Y.doccirrus.auth.isDCPRC() ) {
                    Y.doccirrus.communication.callPUCAction( {
                        ensureDelivery: true,
                        action: 'setBookFlag',
                        params: {
                            customerIdPrac: myPrac.dcCustomerNo,
                            onlyPracticesPatientsCanBook: myPrac.onlyPracticesPatientsCanBook
                        }
                    }, ( err ) => {
                        if( err ) {
                            Y.log( `initPractice: Error setting onlyPracticesPatientsCanBook value on PUC: ${err.message || err}`, 'warn', NAME );
                        }
                        Y.log( `initPractice: Completed with setBookFlag`, 'info', NAME );
                    } );
                } else {
                    Y.log( `initPractice:  Completed`, 'info', NAME );
                }
            } );
        }

    // COUNTRY MODE ====================================================================================================
        /**
         * @method PUBLIC
         * @JsonRpcApi
         *
         * This method is to retrieve the countryMode array for the practice.
         * The method can be called with JsonRpc or be called from the back-end in which case it returns a promise.
         *
         * JsonRpc call:
         * @param {Object} args :REQUIRED:
         * @param {Function} args.callback :REQUIRED: callback function for responding to JsonRpc call
         * @param {Object} args.user :OPTIONAL: User object to use for performing DB operation, defaults to SUForLocal
         * @param {Object} args.originalParams :OPTIONAL: Params from JsonRpc call
         * @param {Boolean} args.originalParams.fromConfig :OPTIONAL: specifies if the countryMode should be looked up from the config instead of the DB
         * @returns {Array} array of strings of country codes
         *
         * Backend API call:
         * @param {Object} args :OPTIONAL:
         * @param {Boolean} args.fromConfig :OPTIONAL: specifies if the countryMode should be looked up from the config instead of the DB
         * @returns {Promise} resolving to an array of strings of country codes
         */
        async function getCountryMode( args = {} ) {
            const {user, callback, originalParams} = args;
            const fromConfig = originalParams && originalParams.fromConfig || args.fromConfig;
            let countryMode;

            if( fromConfig ) {

                countryMode = Y.config.doccirrus.Env.countryMode;

            } else {

                const [err, practices] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user || Y.doccirrus.auth.getSUForLocal(),
                        model: 'practice',
                        action: 'get',
                        options: {
                            limit: 1,
                            select: {
                                countryMode: 1
                            }
                        }
                    } )
                );

                if( err ) {
                    Y.log( `getCountryMode: Error getting countryMode: ${err.stack || err}`, 'error', NAME );
                    if( callback ) {
                        return callback( Y.doccirrus.errors.rest( '117000' ) );
                    } else {
                        throw err;
                    }
                }
                countryMode = practices && practices[0] && practices[0].countryMode || [ 'D' ];

            }

            return callback ? callback( null, countryMode ) : countryMode;
        }

        async function isCountryMode( countryCode, functionName, args = {} ) {
            const {callback} = args;
            const [err, countryMode] = await formatPromiseResult( getCountryMode( {...args, callback: undefined} ) );

            if( err ) {
                if( callback ) {
                    return callback( Y.doccirrus.errors.rest( '117000' ) );
                } else {
                    throw err;
                }
            }

            const isCountryMode = countryMode.includes( countryCode );
            return callback ? callback( null, {[functionName]: isCountryMode} ) : isCountryMode;
        }

        /**
         * @method PUBLIC
         * @JsonRpcApi
         *
         * This method is to check whether the practice countryMode includes Germany.
         * The method can be called with JsonRpc or be called from the back-end in which case it returns a promise.
         *
         * JsonRpc call:
         * @param {Object} args :REQUIRED:
         * @param {Function} args.callback :REQUIRED: callback function for responding to JsonRpc call
         * @param {Object} args.user :OPTIONAL: User object to use for performing DB operation, defaults to SUForLocal
         * @param {Object} args.originalParams :OPTIONAL: Params from JsonRpc call
         * @param {Boolean} args.originalParams.fromConfig :OPTIONAL: specifies if the countryMode should be looked up from the config instead of the DB
         * @returns {Object} { doesCountryModeIncludeGermany: <Boolean> }
         *
         * Backend API call:
         * @param {Object} args :OPTIONAL:
         * @param {Boolean} args.fromConfig :OPTIONAL: specifies if the countryMode should be looked up from the config instead of the DB
         * @returns {Promise} resolving to a Boolean
         */
        async function doesCountryModeIncludeGermany( args ) {
            return isCountryMode( 'D', doesCountryModeIncludeGermany.name, args );
        }

        /**
         * @method PUBLIC
         * @JsonRpcApi
         *
         * This method is to check whether the practice countryMode includes Switzerland.
         * The method can be called with JsonRpc or be called from the back-end in which case it returns a promise.
         *
         * JsonRpc call:
         * @param {Object} args :REQUIRED:
         * @param {Function} args.callback :REQUIRED: callback function for responding to JsonRpc call
         * @param {Object} args.user :OPTIONAL: User object to use for performing DB operation, defaults to SUForLocal
         * @param {Object} args.originalParams :OPTIONAL: Params from JsonRpc call
         * @param {Boolean} args.originalParams.fromConfig :OPTIONAL: specifies if the countryMode should be looked up from the config instead of the DB
         * @returns {Object} { doesCountryModeIncludeSwitzerland: <Boolean> }
         *
         * Backend API call:
         * @param {Object} args :OPTIONAL:
         * @param {Boolean} args.fromConfig :OPTIONAL: specifies if the countryMode should be looked up from the config instead of the DB
         * @returns {Promise} resolving to a Boolean
         */
        async function doesCountryModeIncludeSwitzerland( args ) {
            return isCountryMode( 'CH', doesCountryModeIncludeSwitzerland.name, args );
        }

        /**
         * @method PUBLIC
         *
         * This method saves the DB practice countryMode to the YUI config
         *
         * @param {Object} callback :OPTIONAL:
         * With provided callback:
         * @returns {Array} array of strings of country codes
         * Without callback:
         * @returns {Promise} resolving to an array of strings of country codes
         */
        async function savePracticeCountryModeToConfigs( callback ) {
            const [err, countryMode] = await formatPromiseResult( getCountryMode() );

            if( err ) {
                Y.log( `savePracticeCountryModeToConfigs: Error in saving countryMode to configs: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            Y.config.doccirrus.Env.countryMode = countryMode;
            return callback( null, countryMode );
        }

        /**
         * @public
         *
         * This method returns 'updateNoShowAtEod' value from 'practices' collection.
         * NOTE: If the key 'updateNoShowAtEod' is not found in DB then true is returned as
         *       a default case
         *
         *
         * @param {object} args
         *   @param {object} args.user
         *
         * @returns {Promise<boolean>} - Returns flag 'updateNoShowAtEod' value from 'practices' collection
         */
        async function getUpdateNoShowAtEodFlag( args ) {
            const
                {user} = args;

            if( !user ) {
                throw new Error("Missing 'user' from the input argument");
            }

            const [err, practiceArr] = await formatPromiseResult(
                                                Y.doccirrus.mongodb.runDb( {
                                                    user: user,
                                                    model: 'practice',
                                                    action: 'get',
                                                    options: {
                                                        select: {
                                                            updateNoShowAtEod: 1
                                                        }
                                                    }
                                                } )
                                              );

            if( err ) {
                Y.log(`getUpdateNoShowAtEodFlag: Error querying practice collection. Error: ${err.stack || err}`, "error", NAME);
                throw err;
            }

            if( !Array.isArray(practiceArr) || !practiceArr.length ) {
                throw new Error(`Practice entry not found in 'practices' collection`);
            }

            if( practiceArr.length > 1 ) {
                throw new Error(`Multiple practice entries found in 'practices' collection. Expected only 1 entry`);
            }

            if( typeof practiceArr[0].updateNoShowAtEod !== "boolean" ) {
                Y.log(`getUpdateNoShowAtEodFlag: 'updateNoShowAtEod' key in the 'practices' collection does not exist and is = ${practiceArr[0].updateNoShowAtEod}. Expecting this key to be boolean in DB. Returning true in this case`, "warn", NAME);
                return true;
            }

            return practiceArr[0].updateNoShowAtEod;
        }

        Y.namespace( 'doccirrus.api' ).practice = {

            name: NAME,
            runOnStart: initPractice,
            put: function( args ) {
                Y.log('Entering Y.doccirrus.api.practice.put', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.practice.put');
                }
                args.query = args.query || {};
                args.data = Y.doccirrus.filters.cleanDbObject( args.data );
                Y.doccirrus.mongodb.runDb( {
                    action: 'put',
                    model: args.model,
                    user: args.user,
                    query: args.query,
                    fields: args.fields,
                    data: args.data,
                    callback: args.callback
                } );
            },

            /**
             * Updates fields in current practice, connected to intime config
             * -- if deactivateCardReadAdHoc is true, set autoEventsOnCardReadNoAppointment in incaseconfiguration to false
             *
             * @param {Object} args
             * @param {Object} args.user
             * @param {Object} args.data - data to update
             * @param {String} args.data.practiceId - id of practice to update
             * @param {Boolean} [args.data.deactivateCardReadAdHoc] - flag which indicates should we set autoEventsOnCardReadNoAppointment in incaseconfiguration  to false
             * @param {Boolean} [args.data.allowAdhoc]
             * @param {Boolean} [args.data.allowPRCAdhoc]
             * @param {Boolean} [args.data.autoShift]
             * @param {Boolean} [args.data.autoMutateOff]
             * @param {Boolean} [args.data.autoEnd]
             * @param {Boolean} [args.data.onlyPracticesPatientsCanBook]
             * @param {Boolean} [args.data.allowBookingsOutsideOpeningHours]
             * @param {String} [args.data.calendarViewDayStart]
             * @param {String} [args.data.calendarViewDayEnd]
             * @param {String} [args.data.colorMode]
             * @param {Array} [args.data.hiddenDays]
             * @param {Boolean} [args.data.updateNoShowAtEod]
             * @param {Function} args.callback
             * @returns {Function} callback
             */
            saveIntimeConfig: async function( args ) {
                Y.log( 'Entering Y.doccirrus.api.practice.saveIntimeConfig', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.practice.saveIntimeConfig' );
                }
                const {user, data = {}, callback} = args,
                    id = data.practiceId;

                let err, result;

                data.skipcheck_ = true;

                if( data && data.deactivateCardReadAdHoc ) {
                    [err] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            action: 'put',
                            model: 'incaseconfiguration',
                            fields: ['autoEventsOnCardReadNoAppointment'],
                            query: {_id: Y.doccirrus.schemas.incaseconfiguration.getDefaultData()._id},
                            data: Y.doccirrus.filters.cleanDbObject( {autoEventsOnCardReadNoAppointment: false} )
                        } )
                    );
                    if( err ) {
                        Y.log( `saveIntimeConfig. Error while updating autoEventsOnCardReadNoAppointment value. Error: ${err.stack || err}`, 'warn', NAME );
                        return callback( err );
                    }
                }
                [err, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                            user,
                            action: 'put',
                            model: 'practice',
                            fields: ['allowAdhoc', 'allowPRCAdhoc', 'autoShift', 'autoMutateOff', 'autoEnd', 'onlyPracticesPatientsCanBook', 'allowBookingsOutsideOpeningHours', 'calendarViewDayStart', 'calendarViewDayEnd', 'colorMode', 'hiddenDays', 'updateNoShowAtEod', 'activateOverview'],
                            query: {_id: id},
                            data: Y.doccirrus.filters.cleanDbObject( data )
                        }
                    )
                );

                if( err ) {
                    Y.log( `saveIntimeConfig. Error while updating practice. Error: ${err.stack || err}`, 'warn', NAME );
                    return callback( err );
                }
                Y.doccirrus.scheduling.removeFromCache( user.tenantId ); // scheduler must be renewed
                return callback( null, result );
            },
            /**
             * get intime configuration
             * they should be enabled by default if there is no config data in DB
             * @param args
             */
            getIntimeConfig: function( args ) {
                Y.log('Entering Y.doccirrus.api.practice.getIntimeConfig', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.practice.getIntimeConfig');
                }
                var
                    callback = args.callback;

                Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    action: 'get',
                    model: 'practice',
                    query: {},
                    options: { limit: 1 },
                    callback: function( err, result ) {
                        var
                            practice = result && result[0];
                        if( err ) {
                            return callback( err );

                        }
                        if( practice ) {
                            if( undefined !== practice.autoShift && undefined !== practice.allowAdhoc && undefined !== practice.allowPRCAdhoc ) {
                                return callback( null, {
                                    colorMode: practice.colorMode,
                                    autoShift: practice.autoShift,
                                    allowAdhoc: practice.allowAdhoc,
                                    allowPRCAdhoc: practice.allowPRCAdhoc,
                                    autoMutateOff: practice.autoMutateOff,
                                    onlyPracticesPatientsCanBook: practice.onlyPracticesPatientsCanBook || false,
                                    allowBookingsOutsideOpeningHours: Y.Lang.isUndefined( practice.allowBookingsOutsideOpeningHours ) ? Y.doccirrus.schemas.practice.types.IntimeConfiguration_T.allowBookingsOutsideOpeningHours.default : practice.allowBookingsOutsideOpeningHours,
                                    calendarViewDayStart: practice.calendarViewDayStart || Y.doccirrus.schemas.practice.types.IntimeConfiguration_T.calendarViewDayStart.default,
                                    calendarViewDayEnd: practice.calendarViewDayEnd || Y.doccirrus.schemas.practice.types.IntimeConfiguration_T.calendarViewDayEnd.default,
                                    hiddenDays: practice.hiddenDays || [],
                                    activateOverview: practice.activateOverview || false
                                } );
                            }
                            return callback( null, {
                                autoShift: true,
                                allowAdhoc: true,  // enabled by default
                                allowPRCAdhoc: true,  // enabled by default
                                colorMode: practice.colorMode,
                                autoMutateOff: false,
                                onlyPracticesPatientsCanBook: practice.onlyPracticesPatientsCanBook || false,
                                allowBookingsOutsideOpeningHours: Y.doccirrus.schemas.practice.types.IntimeConfiguration_T.allowBookingsOutsideOpeningHours.default,
                                calendarViewDayStart: Y.doccirrus.schemas.practice.types.IntimeConfiguration_T.calendarViewDayStart.default,
                                calendarViewDayEnd: Y.doccirrus.schemas.practice.types.IntimeConfiguration_T.calendarViewDayEnd.default,
                                hiddenDays: practice.hiddenDays || [],
                                activateOverview: practice.activateOverview || false
                            } );

                        }
                        Y.log( 'no Practice in db, no intime configuration', 'warn', NAME );
                        callback( null, null ); // no practice, missing intime configuration

                    }
                } );
            },
            /**
             *
             * @param arg1 usual args object or user object
             * @param arg2 undefined or callback
             */
            getMyPractice: function( arg1, arg2 ) {
                let
                    callback = arg2 || arg1.callback,
                    user = arg1.user || arg1;

                function ensureDefaultData( prac, field ) {
                    let
                        defaultConf = [
                            {
                                type: 'email',
                                receiver: 'patient',
                                active: false
                            },
                            {
                                type: 'sms',
                                receiver: 'patient',
                                active: false
                            },
                            {
                                type: 'email',
                                receiver: 'location',
                                active: false
                            }
                        ];
                    prac[field] = prac[field] || [];
                    if( !prac[field].length ) {
                        prac[field] = defaultConf;
                    }
                }

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'practice',
                    options: { limit: 1 },
                    query: {},
                    migrate: true,
                    useCache: false,
                    callback: function( err, result ) {
                        let
                            prac = result && result[0];
                        if( err ) {
                            return callback( err );
                        }
                        if( !prac ) {
                            return callback( new Y.doccirrus.commonerrors.DCError( 500, { message: 'Practice not found' } ) );
                        }
                        ensureDefaultData( prac, 'createAlert' );
                        ensureDefaultData( prac, 'updateAlert' );
                        ensureDefaultData( prac, 'deleteAlert' );
                        ensureDefaultData( prac, 'reminderAlert1' );
                        ensureDefaultData( prac, 'reminderAlert2' );
                        ensureDefaultData( prac, 'reminderAlert3' );
                        callback( err, prac );
                    }
                } );
            },
            getDCCustomerNo: async function( args ) {
                Y.log('Entering Y.doccirrus.api.practice.getDCCustomerNo', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.practice.getDCCustomerNo');
                }
                var
                    user = args.user || args;

                let [ err, practices ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'practice',
                        action: 'get'
                    } )
                );
                if( err ) {
                    Y.log(`getDCCustomerNo: Error getting identity: ${err.stack || err}`, 'error', NAME);

                    if( args.callback ) {
                        return args.callback(err);
                    }

                    throw err;
                }
                let dcCustomerNo = practices && practices[0] && practices[0].dcCustomerNo;
                if( args.callback ) {
                    return args.callback( null, dcCustomerNo );
                }
                return dcCustomerNo;
            },
            getCountryMode,
            doesCountryModeIncludeGermany,
            doesCountryModeIncludeSwitzerland,
            savePracticeCountryModeToConfigs,
            getUpdateNoShowAtEodFlag
        };
    },
    '0.0.1', { requires: ['practice-schema', 'dccache'] }
);
