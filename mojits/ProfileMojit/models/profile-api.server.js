/*global YUI */
YUI.add( 'profile-api', function( Y, NAME ) {
        
        const
            {formatPromiseResult} = require( 'dc-core' ).utils;


        function getDefaultProfile( args ) {
            Y.log('Entering Y.doccirrus.api.profile.getDefaultProfile', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.profile.getDefaultProfile');
            }
            const
                {callback} = args;

            Y.doccirrus.mongodb.runDb( {
                user: Y.doccirrus.auth.getSUForLocal(),
                model: 'admin',
                action: 'get',
                query: {
                    _id: Y.doccirrus.schemas.admin.getId()
                },
                options: {
                    select: { defaultCommonProfile: 1, defaultCommonProfileDate: 1 }
                },
                useCache: false
            }, callback );
        }

        function setDefaultProfile( args ) {
            Y.log('Entering Y.doccirrus.api.profile.setDefaultProfile', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.profile.setDefaultProfile');
            }
            const
                {originalParams, callback} = args;

            if( !originalParams || !originalParams.toSet ){
                return callback( null );
            }

            Y.doccirrus.mongodb.runDb( {
                user: Y.doccirrus.auth.getSUForLocal(),
                model: 'admin',
                action: 'put',
                query: {
                    _id: Y.doccirrus.schemas.admin.getId()
                },
                fields: [ 'defaultCommonProfile', 'defaultCommonProfileDate' ],
                data: Y.doccirrus.filters.cleanDbObject( { defaultCommonProfile: originalParams.toSet, defaultCommonProfileDate: new Date() } )
            }, callback );
        }

        /**
         * @method storeProfile
         * @public
         *
         * collect user related backend and frontend (Local Storage - passed with parameters) data
         * and store into profile, if commonProfole === true, profile stored for all users
         *
         * @param {Object} user
         * @param {Object} originalParams
         * @param {String} originalParams.userId
         * @param {String} originalParams.profileLabel
         * @param {String} originalParams.workStation
         * @param {Array} [originalParams.tiCardReaders]
         * @param {Boolean} originalParams.commonProfile
         * @param {Object} originalParams.localStorage
         * @param {Function} callback
         *
         * @returns {Function} callback
         */
        async function storeProfile( { user, originalParams, callback }  ) {
            Y.log('Entering Y.doccirrus.api.profile.storeProfile', 'info', NAME);
            if (callback) {
                callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(callback, 'Exiting Y.doccirrus.api.budget.calculate');
            }
            if( !originalParams || !(Object.keys(originalParams).length) || !originalParams.userId ){
                Y.log( 'storeProfile: Missed data for storing profile ', 'warn', NAME );
                return callback( null );
            }

            const
                { userId, profileLabel = '', workStation = '', tiCardReaders = [], commonProfile = false, localStorage } = originalParams;

            let
                data = {
                    userId,
                    profileLabel,
                    workStation,
                    tiCardReaders,
                    commonProfile,
                    timestamp: new Date(),
                    config: {
                        localStorage: localStorage
                    }
                },
                err;

            let identities, specifiedBy;
            [ err, identities ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'identity',
                    action: 'get',
                    query: {username: userId }
                } )
            );
            if( err ) {
                Y.log(`storeProfile: Error getting identity: ${err.stack || err}`, 'error', NAME);
                return callback(err);
            }
            if( identities && identities.length ) {
                specifiedBy = identities[0].specifiedBy;

                let formPrinters;
                [ err, formPrinters ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'formprinter',
                        action: 'get',
                        query: {identityId: identities[0]._id },
                        useCache: false
                    } )
                );
                if( err ) {
                    Y.log(`storeProfile: Error getting formprinters: ${err.stack || err}`, 'error', NAME);
                    return callback(err);
                }
                if( formPrinters && formPrinters.length ) {
                    data.config.formPrinters = formPrinters;
                }
            }

            let koTableKonfigurations;
            [ err, koTableKonfigurations ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'kotableconfiguration',
                    action: 'get',
                    query: { userId },
                    useCache: false
                } )
            );
            if( err ) {
                Y.log(`storeProfile: Error getting kotableconfigurations: ${err.stack || err}`, 'error', NAME);
                return callback(err);
            }
            if( koTableKonfigurations && koTableKonfigurations.length ) {
                data.config.koTableKonfigurations = koTableKonfigurations;
            }

            let insight2Containers;
            [ err, insight2Containers ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'insight2containers',
                    action: 'get',
                    query: { userId },
                    useCache: false
                } )
            );
            if( err ) {
                Y.log(`storeProfile: Error getting insight containers: ${err.stack || err}`, 'error', NAME);
                return callback(err);
            }
            if( insight2Containers && insight2Containers.length ) {
                data.config.insight2Containers = insight2Containers;
            }

            let dashboards;
            [ err, dashboards ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'dashboard',
                    action: 'get',
                    query: { userId },
                    useCache: false
                } )
            );
            if( err ) {
                Y.log(`storeProfile: Error getting dashboards: ${err.stack || err}`, 'error', NAME);
                return callback(err);
            }
            if( dashboards && dashboards.length ) {
                data.config.dashboards = dashboards;
            }

            let actionbuttons;
            [ err, actionbuttons ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'actionbutton',
                    action: 'get',
                    query: { userId },
                    useCache: false
                } )
            );
            if( err ) {
                Y.log(`storeProfile: Error getting actionbuttons: ${err.stack || err}`, 'error', NAME);
                return callback(err);
            }
            if( actionbuttons && actionbuttons.length ) {
                data.config.actionbuttons = actionbuttons;
            }

            let activitysettingsusers;
            [ err, activitysettingsusers ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activitysettingsuser',
                    action: 'get',
                    query: { userId },
                    useCache: false
                } )
            );
            if( err ) {
                Y.log(`storeProfile: Error getting activitysettingsusers: ${err.stack || err}`, 'error', NAME);
                return callback(err);
            }
            if( activitysettingsusers && activitysettingsusers.length ) {
                data.config.activitysettingsusers = activitysettingsusers;
            }

            let employees;
            [ err, employees ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'employee',
                    action: 'get',
                    query: { _id: specifiedBy },
                    useCache: false
                } )
            );

            if( err ) {
                Y.log(`storeProfile: Error getting employees: ${err.stack || err}`, 'error', NAME);
                return callback(err);
            }
            if( employees && employees.length ) {
                data.config.labdataSortOrder = employees[0].labdataSortOrder;
            }

            let query = {
                profileLabel,
                workStation,
                tiCardReaders,
                commonProfile
            };

            if( !commonProfile ){
                query.userId = userId;
            }

            [ err ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'profile',
                    action: 'upsert',
                    query,
                    fields: Object.keys( data ),
                    options: {omitQueryId: true},
                    data: Y.doccirrus.filters.cleanDbObject( data )
                } )
            );
            if( err ) {
                Y.log(`storeProfile: Error upserting profile: ${err.stack || err}`, 'error', NAME);
            }

            callback(err);
        }


        /**
         * @method reassignUserId
         * @private
         *
         * remove original _id and reassign userId for posting data
         *
         * @param {Array} collectionData
         * @param {String} userId
         *
         * @returns {Array}
         */
        function reassignUserId( collectionData, userId ) {
            return collectionData.map( el => {
                delete el._id;
                el.userId = userId;
                return el;
            } );
        }

        /**
         * @method remove
         * @private
         *
         * remove data from given collection by query
         *
         * @param {Object} user
         * @param {String} modelName
         * @param {Object} query
         *
         */
        async function remove( user, modelName, query ) {
            if( !query || !Object.keys(query).length ){
                throw new Error( `empty query for removing ${modelName}` );
            }
            let [ err ] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.mongodb.getModel( user, modelName, (err, model ) => {
                        if( err ){
                            return reject(err);
                        }
                        model.mongoose.remove( query, (err) => {
                            if( err ){
                                return reject( err );
                            }
                            resolve();
                        } );
                    } );
                } )
            );
            if( err ) {
                Y.log(`profile::remove: Error removing model ${modelName}: ${err.stack || err}`, 'error', NAME);
                throw err;
            }
        }

        /**
         * @method reStoreProfile
         * @public
         *
         * remove related to user profile data from various collection and post there data from profile
         *
         * @param {Object} user
         * @param {Object} originalParams
         * @param {String} originalParams._id
         * @param {Function} callback
         *
         * @returns {Function} callback
         */
        async function reStoreProfile( { user, originalParams, callback } ) {
            Y.log('Entering Y.doccirrus.api.profile.reStoreProfile', 'info', NAME);
            if (callback) {
                callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(callback, 'Exiting Y.doccirrus.api.budget.calculate');
            }
            if( !originalParams || !(Object.keys(originalParams).length) || !originalParams._id ){
                Y.log( 'reStoreProfile: Missed data for restoring profile ', 'warn', NAME );
                return callback( null );
            }

            const
                { _id } = originalParams;

            let err,
                profiles, profile, userId;
            [ err, profiles ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'profile',
                    action: 'get',
                    query: { _id },
                    useCache: false
                } )
            );
            if( err ) {
                Y.log(`reStoreProfile: Error getting profile: ${err.stack || err}`, 'error', NAME);
                return callback(err);
            }
            profile = profiles && profiles[0];
            if( true === profile.commonProfile ){
                profile.userId = user.id;
            }
            userId = profile.userId;

            if( !profile || !profile.config ){
                Y.log( 'reStoreProfile: profile has no config', 'warn', NAME);
                return callback();
            }

            if( profile.config.formPrinters && Y.doccirrus.auth.hasCollectionAccess( user, 'write', 'formprinter' ) ){
                let identityId = profile.commonProfile ? user.identityId : profile.config.formPrinters[0].identityId;
                [ err ] = await formatPromiseResult(
                    remove(user, 'formprinter', { identityId } )
                );
                if( err ) {
                    Y.log(`reStoreProfile: Error removing formprinter: ${err.stack || err}`, 'error', NAME);
                    return callback(err);
                }
                let locations;
                [ err, locations ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'location',
                        action: 'get',
                        query: {}
                    } )
                );
                if( err ) {
                    Y.log(`reStoreProfile: Error getting locations: ${err.stack || err}`, 'error', NAME);
                    return callback(err);
                }
                let locationsIds = locations.map( el => el._id.toString() );
                profile.config.formPrinters = profile.config.formPrinters.filter( el => locationsIds.includes( el.locationId ) );

                profile.config.formPrinters = profile.config.formPrinters.map( el => {
                    delete el._id;
                    el.identityId = identityId;
                    return el;
                } );

                [ err ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'formprinter',
                        action: 'post',
                        data: Y.doccirrus.filters.cleanDbObject( profile.config.formPrinters )
                    } )
                );
                if( err ) {
                    Y.log(`reStoreProfile: Error posting formprinter: ${err.stack || err}`, 'error', NAME);
                    return callback(err);
                }
            }

            if( profile.config.koTableKonfigurations && Y.doccirrus.auth.hasCollectionAccess( user, 'write', 'kotableconfiguration' ) ){
                [ err ] = await formatPromiseResult(
                    remove( user, 'kotableconfiguration', { userId } )
                );
                if( err ) {
                    Y.log(`reStoreProfile: Error removing kotableconfiguration: ${err.stack || err}`, 'error', NAME);
                    return callback(err);
                }

                profile.config.koTableKonfigurations = reassignUserId( profile.config.koTableKonfigurations, userId );

                [ err ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'kotableconfiguration',
                        action: 'post',
                        data: Y.doccirrus.filters.cleanDbObject( profile.config.koTableKonfigurations )
                    } )
                );
                if( err ) {
                    Y.log(`reStoreProfile: Error posting kotableconfiguration: ${err.stack || err}`, 'error', NAME);
                    return callback(err);
                }
            }

            if( profile.config.insight2Containers && Y.doccirrus.auth.hasCollectionAccess( user, 'write', 'insight2containers' ) ){
                [ err ] = await formatPromiseResult(
                    remove( user, 'insight2containers', { userId })
                );
                if( err ) {
                    Y.log(`reStoreProfile: Error removing insight containers: ${err.stack || err}`, 'error', NAME);
                    return callback(err);
                }

                profile.config.insight2Containers = reassignUserId( profile.config.insight2Containers, userId );

                [ err ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'insight2containers',
                        action: 'post',
                        data: Y.doccirrus.filters.cleanDbObject( profile.config.insight2Containers )
                    } )
                );
                if( err ) {
                    Y.log(`reStoreProfile: Error posting insight containers: ${err.stack || err}`, 'error', NAME);
                    return callback(err);
                }
            }

            if( profile.config.dashboards && Y.doccirrus.auth.hasCollectionAccess( user, 'write', 'dashboard' ) ){
                [ err ] = await formatPromiseResult(
                    remove( user, 'dashboard', { userId } )
                );
                if( err ) {
                    Y.log(`reStoreProfile: Error removing dashboards: ${err.stack || err}`, 'error', NAME);
                    return callback(err);
                }

                profile.config.dashboards = reassignUserId( profile.config.dashboards, userId );

                [ err ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'dashboard',
                        action: 'post',
                        data: Y.doccirrus.filters.cleanDbObject( profile.config.dashboards )
                    } )
                );
                if( err ) {
                    Y.log(`reStoreProfile: Error posting dashboards: ${err.stack || err}`, 'error', NAME);
                    return callback(err);
                }
            }

            if( profile.config.actionbuttons && Y.doccirrus.auth.hasCollectionAccess( user, 'write', 'actionbutton' ) ){
                [ err ] = await formatPromiseResult(
                    remove( user, 'actionbutton', { userId } )
                );
                if( err ) {
                    Y.log(`reStoreProfile: Error removing actionbuttons: ${err.stack || err}`, 'error', NAME);
                    return callback(err);
                }

                profile.config.actionbuttons = reassignUserId( profile.config.actionbuttons, userId );

                [ err ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'actionbutton',
                        action: 'post',
                        data: Y.doccirrus.filters.cleanDbObject( profile.config.actionbuttons )
                    } )
                );
                if( err ) {
                    Y.log(`reStoreProfile: Error posting actionbuttons: ${err.stack || err}`, 'error', NAME);
                    return callback(err);
                }
            }

            if( profile.config.activitysettingsusers && Y.doccirrus.auth.hasCollectionAccess( user, 'write', 'activitysettingsuser' ) ){
                [ err ] = await formatPromiseResult(
                    remove( user, 'activitysettingsuser', { userId } )
                );
                if( err ) {
                    Y.log(`reStoreProfile: Error removing activitysettingsusers: ${err.stack || err}`, 'error', NAME);
                    return callback(err);
                }

                profile.config.activitysettingsusers = reassignUserId( profile.config.activitysettingsusers, userId );

                [ err ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activitysettingsuser',
                        action: 'post',
                        data: Y.doccirrus.filters.cleanDbObject( profile.config.activitysettingsusers )
                    } )
                );
                if( err ) {
                    Y.log(`reStoreProfile: Error posting activitysettingsusers: ${err.stack || err}`, 'error', NAME);
                    return callback(err);
                }
            }
            let identity;
            [ err, identity ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'identity',
                    action: 'put',
                    query: { username: userId },
                    fields: [ 'profileLastActivated' ],
                    data: Y.doccirrus.filters.cleanDbObject( {
                        profileLastActivated: {
                            timestamp: new Date(),
                            profileId: profile._id.toString(),
                            workStation: profile.workStation,
                            tiCardReaders: profile.tiCardReaders,
                            profileLabel: profile.profileLabel
                        }
                    } ),
                    useCache: false
                } )
            );
            if( err ) {
                Y.log(`reStoreProfile: Error updating profileLastActivated: ${err.stack || err}`, 'error', NAME);
                return callback(err);
            }

            if( profile.config.labdataSortOrder && identity && identity.specifiedBy ){
                [ err ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'employee',
                        action: 'update',
                        query: { _id: identity.specifiedBy },
                        fields: [ 'labdataSortOrder' ],
                        data: { $set: { labdataSortOrder: profile.config.labdataSortOrder } },
                        useCache: false
                    } )
                );
                if( err ) {
                    Y.log(`reStoreProfile: Error updating labdataSortOrder: ${err.stack || err}`, 'error', NAME);
                    return callback(err);
                }
            }

            let
                profileConfig = ((profile || {}).config || {}).localStorage;
            callback( null, profileConfig );
        }

        function deleteProfile( args ) {
            const
                { user, originalParams, callback } = args;

            if( !originalParams || !(Object.keys(originalParams).length) || !originalParams._id ){
                Y.log( 'Missed data for deleting profile ', 'warn', NAME );
                return callback( null );
            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'profile',
                action: 'delete',
                query: {
                    _id: originalParams._id
                }
            }, (err) => {
                if( err ) {
                    Y.log( 'Error on deleting profile ' + err.message, 'error', NAME );
                }
                callback( err );
            } );
        }

        function updateDefaultPrinter ( args ) {
            Y.log('Entering Y.doccirrus.api.profile.updateDefaultPrinter', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.profile.updateDefaultPrinter');
            }
            if( !args.data || !args.query ){
                Y.log( 'Missed data for updating profiles default printer ', 'warn', NAME );
                return args.callback( null );
            }

            let data;

            if( args.data.defaultPrinter && args.data.lastLocation ) {
                data = {
                    $set: {
                        [`config.localStorage.${args.user.id}_lastPrintedLocation`]: JSON.stringify(args.data.lastLocation),
                        [`config.localStorage.${args.user.id}_defaultPrinter`]: JSON.stringify(args.data.defaultPrinter)
                    }
                };
            } else {
                data = {
                    $set: {
                        [`config.localStorage.${args.user.id}_defaultPrinter`]: JSON.stringify(args.data)
                    }
                };
            }

            Y.doccirrus.mongodb.runDb( {
                user: args.user,
                model: 'profile',
                action: 'update',
                query: args.query,
                data: Y.doccirrus.filters.cleanDbObject( data ),
                fields: ['config.localStorage']
            }, (err) => {
                if( err ) {
                    Y.log( 'Error on updating profile ' + err.message, 'error', NAME );
                }
                args.callback( err );
            } );
        }


        /**
         *  Temporary / dev / support route to fix customer issue EXTMOJ-1478
         *
         *  May be converted into a migration to correct broken profiles
         *
         *  @param args
         */

        function fixJSONinProfiles( args ) {
            Y.doccirrus.inCaseUtils.migrationhelper.fixJSONInProfiles( args.user, false, onMigrationComplete );

            function onMigrationComplete( err, report ) {
                if ( err ) {
                    Y.log( `Problem completing cleanup of JSON formatting in stored profiles: ${JSON.stringify( err )}`, 'warn', NAME );
                    return args.callback( err, report );
                }
                args.callback( null, report );
            }

        }

        Y.namespace( 'doccirrus.api' ).profile = {

            name: NAME,
            getDefaultProfile: getDefaultProfile,
            setDefaultProfile: setDefaultProfile,
            storeProfile: storeProfile,
            reStoreProfile: reStoreProfile,
            delete: deleteProfile,
            updateDefaultPrinter: updateDefaultPrinter,

            //  temporary / dev / support routes
            fixJSONInProfiles: fixJSONinProfiles
        };

    },
    '0.0.1', {
        requires: [
            'profile-schema',
            'dcerror',
            'profileimportexport'
        ]
    }
);
