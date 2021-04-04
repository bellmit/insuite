/*global YUI */
YUI.add( 'kotableconfiguration-api', function( Y, NAME ) {
        'use strict';

        var
            KOTABLECONFIGURATION_PRESET_USER_ID = 'KOTABLECONFIGURATION_PRESET_USER',
            accessError = Y.doccirrus.errors.rest( 401, '', true );

        /**
         * Clone all kotableconfiguration for a user to use as preset
         * 1. authorized required
         * 2. clears existing preset
         * 3. clone that users configurations as preset
         * @method cloneAllTableConfigurationForUserAsPreset
         * @param {Object} parameters
         * @param {Object} parameters.originalParams
         * @param {String} parameters.originalParams.userId
         */
        function cloneAllTableConfigurationForUserAsPreset( parameters ) {
            Y.log('Entering Y.doccirrus.api.kotableconfiguration.cloneAllTableConfigurationForUserAsPreset', 'info', NAME);
            if (parameters.callback) {
                parameters.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(parameters.callback, 'Exiting Y.doccirrus.api.kotableconfiguration.cloneAllTableConfigurationForUserAsPreset');
            }
            var
                user = parameters.user,
                callback = parameters.callback,
                params = parameters.originalParams,
                userId = params.userId;

            if( !Y.doccirrus.auth.hasAPIAccess( user, 'kotableconfiguration.cloneAllTableConfigurationForUserAsPreset' ) ) {
                return callback( accessError );
            }

            clearTableConfigurationPreset( {
                user: user,
                callback: function( error, result ) {
                    if( error ) {
                        return callback( error, result );
                    }

                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'kotableconfiguration',
                        query: {
                            userId: userId
                        },
                        action: 'get',
                        options: {
                            lean: true
                        }
                    }, function( error, result ) {
                        if( error ) {
                            return callback( error, result );
                        }

                        require( 'async' )
                            .concat( result, function( configuration, posted ) {

                                delete configuration._id;
                                delete configuration.user_;
                                configuration.userId = KOTABLECONFIGURATION_PRESET_USER_ID;

                                Y.doccirrus.mongodb.runDb( {
                                    user: user,
                                    model: 'kotableconfiguration',
                                    action: 'post',
                                    data: Y.doccirrus.filters.cleanDbObject( configuration ),
                                    options: {
                                        entireRec: true
                                    }
                                }, function( error, result ) {
                                    posted( error, result && result[0] );
                                } );

                            }, function( error, results ) {
                                if( error ) {
                                    return callback( error, results );
                                }

                                Y.doccirrus.api.settings.put( {
                                    user: user,
                                    query: {_id: Y.doccirrus.schemas.settings.getDefaultSettings()._id},
                                    data: {
                                        fields_: ['kotableconfigurationPresetOwnerId','kotableconfigurationPresetCreated'],
                                        kotableconfigurationPresetOwnerId: userId,
                                        kotableconfigurationPresetCreated: require('moment')().toJSON()
                                    },
                                    callback: function( error, result ) {
                                        if( error ) {
                                            return callback( error, result );
                                        }

                                        getTableConfigurationPresetInfo( {
                                            user: user,
                                            callback: function( error, result ) {
                                                if( error ) {
                                                    return callback( error, result );
                                                }

                                                callback( error, {
                                                    preset: results,
                                                    presetOwner: result.presetOwner,
                                                    presetCreated: result.presetCreated
                                                } );
                                            }
                                        } );

                                    }
                                } );

                            } );

                    } );
                }
            } );

        }

        /**
         * Checks if a kotableconfiguration preset exists
         * @method checkTableConfigurationPresetExists
         */
        function checkTableConfigurationPresetExists( parameters ) {
            Y.log('Entering Y.doccirrus.api.kotableconfiguration.checkTableConfigurationPresetExists', 'info', NAME);
            if (parameters.callback) {
                parameters.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(parameters.callback, 'Exiting Y.doccirrus.api.kotableconfiguration.checkTableConfigurationPresetExists');
            }
            var
                user = parameters.user,
                callback = parameters.callback;

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'kotableconfiguration',
                query: {
                    userId: KOTABLECONFIGURATION_PRESET_USER_ID
                },
                action: 'get'
            }, function( error, result ) {
                callback( null, {
                    exists: Boolean( result && result.length )
                } );
            } );
        }

        /**
         * Get info of the kotableconfiguration preset (owner and created) if exists
         * @method checkTableConfigurationPresetExists
         * @param {Object} parameters
         */
        function getTableConfigurationPresetInfo( parameters ) {
            Y.log('Entering Y.doccirrus.api.kotableconfiguration.getTableConfigurationPresetInfo', 'info', NAME);
            if (parameters.callback) {
                parameters.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(parameters.callback, 'Exiting Y.doccirrus.api.kotableconfiguration.getTableConfigurationPresetInfo');
            }
            var
                user = parameters.user,
                callback = parameters.callback;

            checkTableConfigurationPresetExists( {
                user: user,
                callback: function( error, result ) {
                    if( error ) {
                        return callback( error, result );
                    }
                    var
                        exists = result && Y.Object.owns( result, 'exists' ) && result.exists;

                    if( !exists ) {
                        return callback( null, {
                            presetOwner: null,
                            presetCreated: null
                        } );
                    }

                    require( 'async' ).parallel( {
                        presetOwner: function( presetOwnerCallback ) {
                            Y.doccirrus.api.settings.getKotableconfigurationPresetOwner( {
                                user: user,
                                callback: function( error, result ) {
                                    var
                                        presetOwner = null;

                                    if( error ) {
                                        return presetOwnerCallback( error, result );
                                    }

                                    if( result && result[0] ) {
                                        presetOwner = result[0];
                                    }

                                    presetOwnerCallback( null, presetOwner );
                                }
                            } );
                        },
                        presetCreated: function( presetCreatedCallback ) {
                            Y.doccirrus.api.settings.getKotableconfigurationPresetCreated( {
                                user: user,
                                callback: function( error, presetCreated ) {
                                    presetCreated = presetCreated || null;

                                    if( error ) {
                                        return presetCreatedCallback( error, presetCreated );
                                    }

                                    presetCreatedCallback( null, presetCreated );
                                }
                            } );
                        }
                    }, function( error, parallel ) {
                        if( error ) {
                            return callback( error, parallel );
                        }
                        callback( null, {
                            presetOwner: parallel.presetOwner,
                            presetCreated: parallel.presetCreated
                        } );
                    } );

                }
            } );

        }

        /**
         * Clears all kotableconfiguration for a user
         * @method clearAllTableConfigurationForUser
         * @param {Object} parameters
         * @param {Object} parameters.originalParams
         * @param {String} parameters.originalParams.userId
         */
        function clearAllTableConfigurationForUser( parameters ) {
            Y.log('Entering Y.doccirrus.api.kotableconfiguration.clearAllTableConfigurationForUser', 'info', NAME);
            if (parameters.callback) {
                parameters.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(parameters.callback, 'Exiting Y.doccirrus.api.kotableconfiguration.clearAllTableConfigurationForUser');
            }
            var
                user = parameters.user,
                callback = parameters.callback,
                params = parameters.originalParams,
                userId = params.userId;

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'kotableconfiguration',
                query: {
                    userId: userId
                },
                action: 'delete',
                options: {
                    override: true
                }
            }, callback );
        }

        /**
         * Gets all kotableconfiguration for a user
         * @method clearAllTableConfigurationForUser
         * @param {Object} parameters
         * @param {Object} parameters.originalParams
         * @param {String} parameters.originalParams.userId
         */
        function getAllTableConfigurationForUser( parameters ) {
            Y.log('Entering Y.doccirrus.api.kotableconfiguration.getAllTableConfigurationForUser', 'info', NAME);
            if (parameters.callback) {
                parameters.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(parameters.callback, 'Exiting Y.doccirrus.api.kotableconfiguration.getAllTableConfigurationForUser');
            }
            var
                user = parameters.user,
                callback = parameters.callback,
                params = parameters.originalParams,
                userId = params.userId;

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'kotableconfiguration',
                query: {
                    userId: userId
                },
                action: 'get'
            }, callback );
        }

        /**
         * Check that at least one kotableconfiguration for a user has "usage" entries
         * @method clearAllTableConfigurationForUser
         * @param {Object} parameters
         * @param {Object} parameters.originalParams
         * @param {String} parameters.originalParams.userId
         */
        function hasUserTableConfigurations( parameters ) {
            Y.log('Entering Y.doccirrus.api.kotableconfiguration.hasUserTableConfigurations', 'info', NAME);
            if (parameters.callback) {
                parameters.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(parameters.callback, 'Exiting Y.doccirrus.api.kotableconfiguration.hasUserTableConfigurations');
            }
            var
                user = parameters.user,
                callback = parameters.callback,
                params = parameters.originalParams,
                userId = params.userId;

            getAllTableConfigurationForUser( {
                user: user,
                originalParams: {
                    userId: userId
                },
                callback: function( error, result ) {
                    if( error ) {
                        return callback( error, result );
                    }

                    if( result && result.length ) {
                        return callback( error, {
                            hasConfigurations: result.some( function( tableConfiguration ) {
                                return Boolean( tableConfiguration.config && Array.isArray( tableConfiguration.config.usage ) && tableConfiguration.config.usage.length );
                            } )
                        } );
                    }

                    return callback( error, {hasConfigurations: false} );

                }
            } );

        }

        /**
         * Resets kotableconfiguration and applies preset if available for a user
         * 1. clear the users configurations
         * 2. check preset exists
         * 3. clone the preset for the user
         * @method resetTableConfigurationAndApplyPresetForUser
         * @param {Object} parameters
         * @param {Object} parameters.originalParams
         * @param {String} parameters.originalParams.userId
         */
        function resetTableConfigurationAndApplyPresetForUser( parameters ) {
            Y.log('Entering Y.doccirrus.api.kotableconfiguration.resetTableConfigurationAndApplyPresetForUser', 'info', NAME);
            if (parameters.callback) {
                parameters.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(parameters.callback, 'Exiting Y.doccirrus.api.kotableconfiguration.resetTableConfigurationAndApplyPresetForUser');
            }
            var
                user = parameters.user,
                callback = parameters.callback,
                params = parameters.originalParams,
                userId = params.userId;

            clearAllTableConfigurationForUser( {
                user: user,
                originalParams: {
                    userId: userId
                },
                callback: function( error, result ) {
                    if( error ) {
                        return callback( error, result );
                    }

                    checkTableConfigurationPresetExists( {
                        user: user,
                        callback: function( error, result ) {
                            if( error ) {
                                return callback( error, result );
                            }
                            var
                                exists = result && Y.Object.owns( result, 'exists' ) && result.exists;

                            if( !exists ) {
                                return callback( null, [] );
                            }

                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'kotableconfiguration',
                                query: {
                                    userId: KOTABLECONFIGURATION_PRESET_USER_ID
                                },
                                action: 'get',
                                options: {
                                    lean: true
                                }
                            }, function( error, result ) {
                                if( error ) {
                                    return callback( error, result );
                                }

                                require( 'async' )
                                    .concat( result, function( configuration, posted ) {

                                        delete configuration._id;
                                        delete configuration.user_;
                                        configuration.userId = userId;

                                        Y.doccirrus.mongodb.runDb( {
                                            user: user,
                                            model: 'kotableconfiguration',
                                            action: 'post',
                                            data: Y.doccirrus.filters.cleanDbObject( configuration ),
                                            options: {
                                                entireRec: true
                                            }
                                        }, function( error, result ) {
                                            posted( error, result && result[0] );
                                        } );

                                    }, callback );

                            } );

                        }
                    } );

                }
            } );

        }

        /**
         * Clears kotableconfiguration preset
         * 1. authorized required
         * @method clearAllTableConfigurationForUser
         */
        function clearTableConfigurationPreset( parameters ) {
            Y.log('Entering Y.doccirrus.api.kotableconfiguration.clearTableConfigurationPreset', 'info', NAME);
            if (parameters.callback) {
                parameters.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(parameters.callback, 'Exiting Y.doccirrus.api.kotableconfiguration.clearTableConfigurationPreset');
            }
            var
                user = parameters.user,
                callback = parameters.callback;

            if( !Y.doccirrus.auth.hasAPIAccess( user, 'kotableconfiguration.clearTableConfigurationPreset' ) ) {
                return callback( accessError );
            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'kotableconfiguration',
                query: {
                    userId: KOTABLECONFIGURATION_PRESET_USER_ID
                },
                action: 'delete',
                options: {
                    override: true
                }
            }, function( error, kotableconfiguration ) {
                if( error ) {
                    return callback( error );
                }

                Y.doccirrus.api.settings.put( {
                    user: user,
                    query: {_id: Y.doccirrus.schemas.settings.getDefaultSettings()._id},
                    data: {
                        fields_: ['kotableconfigurationPresetOwnerId','kotableconfigurationPresetCreated']
                    },
                    callback: function( error ) {
                        if( error ) {
                            return callback( error );
                        }

                        callback( error, kotableconfiguration );

                    }
                } );

            } );
        }

        /**
         * Saves an user configuration to kotableconfiguration
         * 1. removes it
         * 2. when there are no "usage"s left removes kotableconfiguration
         * @method saveUserConfiguration
         * @param {Object} parameters
         * @param {Object} parameters.originalParams
         * @param {String} parameters.originalParams.userId
         * @param {String} parameters.originalParams.stateId
         * @param {String} parameters.originalParams.config
         */
        function saveUserConfiguration( parameters ) {
            Y.log('Entering Y.doccirrus.api.kotableconfiguration.saveUserConfiguration', 'info', NAME);
            if (parameters.callback) {
                parameters.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(parameters.callback, 'Exiting Y.doccirrus.api.kotableconfiguration.saveUserConfiguration');
            }
            var
                user = parameters.user,
                callback = parameters.callback,
                params = parameters.originalParams,
                userId = params.userId,
                stateId = params.stateId,
                config = params.config;

            if( !config || Y.Object.isEmpty( config ) || Array.isArray( config.usage ) && !config.usage.length ) {

                return Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'kotableconfiguration',
                    query: {
                        userId: userId,
                        stateId: stateId
                    },
                    action: 'delete',
                    options: {
                        override: true
                    }
                }, callback );

            }

            Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'kotableconfiguration',
                    query: {
                        userId: userId,
                        stateId: stateId
                    },
                    action: 'get'
                }, function( error, results ) {
                    if( error ) {
                        return callback( error, results );
                    }

                    if( results && results.length ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'kotableconfiguration',
                            action: 'put',
                            query: {
                                userId: userId,
                                stateId: stateId
                            },
                            data: Y.doccirrus.filters.cleanDbObject( {
                                config: config
                            } ),
                            fields: ['config']
                        }, callback );
                    }
                    else {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'kotableconfiguration',
                            action: 'post',
                            data: Y.doccirrus.filters.cleanDbObject( {
                                userId: userId,
                                stateId: stateId,
                                config: config
                            } ),
                            options: {
                                entireRec: true
                            }
                        }, callback );
                    }

                }
            );

        }

        Y.namespace( 'doccirrus.api' ).kotableconfiguration = {

            name: NAME,

            clearAllTableConfigurationForUser: clearAllTableConfigurationForUser,
            cloneAllTableConfigurationForUserAsPreset: cloneAllTableConfigurationForUserAsPreset,
            checkTableConfigurationPresetExists: checkTableConfigurationPresetExists,
            getAllTableConfigurationForUser: getAllTableConfigurationForUser,
            hasUserTableConfigurations: hasUserTableConfigurations,
            clearTableConfigurationPreset: clearTableConfigurationPreset,
            resetTableConfigurationAndApplyPresetForUser: resetTableConfigurationAndApplyPresetForUser,
            getTableConfigurationPresetInfo: getTableConfigurationPresetInfo,
            saveUserConfiguration: saveUserConfiguration

        };

    },
    '0.0.1', {
        requires: [
            'settings-api',
            'kotableconfiguration-schema',
            'dcerror'
        ]
    }
);
