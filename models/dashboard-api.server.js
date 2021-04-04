/*global YUI */
YUI.add( 'dashboard-api', function( Y, NAME ) {
        'use strict';

        /**
         * Saves an user configuration to dashboard
         * 1. removes it
         * 2. when there are no "dashboards" left removes dashboard
         * @method saveUserConfiguration
         * @param {Object} parameters
         * @param {Object} parameters.originalParams
         * @param {String} parameters.originalParams.userId
         * @param {String} parameters.originalParams.environment
         * @param {String} parameters.originalParams.data
         */
        function saveUserConfiguration( parameters ) {
            Y.log('Entering Y.doccirrus.api.dashboard.saveUserConfiguration', 'info', NAME);
            if (parameters.callback) {
                parameters.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(parameters.callback, 'Exiting Y.doccirrus.api.dashboard.saveUserConfiguration');
            }
            var
                user = parameters.user,
                callback = parameters.callback,
                params = parameters.originalParams,
                userId = params.userId,
                environment = params.environment,
                data = params.data;

            if( !data || Y.Object.isEmpty( data ) || Array.isArray( data.dashboards ) && !data.dashboards.length ) {

                return Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'dashboard',
                    query: {
                        userId: userId,
                        environment: environment
                    },
                    action: 'delete'
                }, callback );

            }

            Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'dashboard',
                    query: {
                        userId: userId,
                        environment: environment
                    },
                    action: 'get'
                }, function( error, results ) {
                    if( error ) {
                        return callback( error, results );
                    }

                    if( results && results.length ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'dashboard',
                            action: 'put',
                            query: {
                                userId: userId,
                                environment: environment
                            },
                            data: Y.doccirrus.filters.cleanDbObject( data ),
                            fields: ['activeDashboardId', 'dashboards']
                        }, callback );
                    }
                    else {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'dashboard',
                            action: 'post',
                            data: Y.doccirrus.filters.cleanDbObject( Y.merge( data, {
                                userId: userId,
                                environment: environment
                            } ) ),
                            options: {
                                entireRec: true
                            },
                            callback: function( error, result ) {
                                if( error ) {
                                    return callback( error, result );
                                }
                                callback( null, Array.isArray( result ) && result[0] || null );
                            }
                        } );
                    }

                }
            );

        }

        Y.namespace( 'doccirrus.api' ).dashboard = {

            name: NAME,

            saveUserConfiguration: saveUserConfiguration

        };

    },
    '0.0.1', {
        requires: [
            'settings-api',
            'dashboard-schema',
            'dcerror'
        ]
    }
);
