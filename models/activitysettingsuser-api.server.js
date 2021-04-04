/*global YUI */
YUI.add( 'activitysettingsuser-api', function( Y, NAME ) {
        'use strict';

        Y.namespace( 'doccirrus.api' ).activitysettingsuser = {

            name: NAME,

            /**
             * @method saveSettingsSorting
             * @param {Object} parameters
             * @param {Object} parameters.originalParams
             * @param {String} parameters.originalParams.userId
             * @param {Array} [parameters.originalParams.settingsSorting]
             * @param {Function} parameters.callback
             * @param {Object} parameters.user
             */
            saveSettingsSorting: function( parameters ) {
                Y.log('Entering Y.doccirrus.api.activitysettingsuser.saveSettingsSorting', 'info', NAME);
                if (parameters.callback) {
                    parameters.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(parameters.callback, 'Exiting Y.doccirrus.api.activitysettingsuser.saveSettingsSorting');
                }
                var
                    params = parameters.originalParams,
                    callback = parameters.callback,
                    user = parameters.user,
                    userId = params.userId,
                    settingsSorting = params.settingsSorting || [];

                function read() {
                    return new Promise( function( resolve, reject ) {
                        Y.doccirrus.mongodb.runDb( {
                            action: 'get',
                            model: 'activitysettingsuser',
                            user: user,
                            query: {userId: userId},
                            callback: function( error, results ) {
                                if( error ) {
                                    return reject( error );
                                }
                                resolve( results );
                            }
                        } );
                    } );
                }

                function create() {
                    return new Promise( function( resolve, reject ) {
                        Y.doccirrus.mongodb.runDb( {
                            action: 'post',
                            model: 'activitysettingsuser',
                            user: user,
                            data: Y.doccirrus.filters.cleanDbObject( {
                                userId: userId,
                                settingsSorting: settingsSorting
                            } ),
                            options: {entireRec: true},
                            callback: function( error, results ) {
                                if( error ) {
                                    return reject( error );
                                }
                                resolve( results );
                            }
                        } );
                    } );
                }

                function update( id ) {
                    return new Promise( function( resolve, reject ) {
                        Y.doccirrus.mongodb.runDb( {
                            action: 'put',
                            model: 'activitysettingsuser',
                            user: user,
                            query: {_id: id},
                            data: Y.doccirrus.filters.cleanDbObject( {settingsSorting: settingsSorting} ),
                            fields: 'settingsSorting',
                            callback: function( error, results ) {
                                if( error ) {
                                    return reject( error );
                                }
                                resolve( results );
                            }
                        } );
                    } );
                }

                function destroy( ids ) {
                    return new Promise( function( resolve, reject ) {
                        Y.doccirrus.mongodb.runDb( {
                            action: 'delete',
                            model: 'activitysettingsuser',
                            user: user,
                            query: {_id: {$in: [].concat( ids )}},
                            callback: function( error, results ) {
                                if( error ) {
                                    return reject( error );
                                }
                                resolve( results );
                            }
                        } );
                    } );
                }

                read()
                    .then( function( results ) {
                        if( !results.length ) {
                            return create();
                        }
                        else {
                            return Promise
                                .all( results.map( function( item, index ) {
                                    if( !index ) {
                                        return update( item._id );
                                    }
                                    else {
                                        return destroy( item._id );
                                    }
                                } ) )
                                .then( function( all ) {
                                    return all[0];
                                } );
                        }
                    } )
                    .then( function( result ) {
                        callback( null, result );
                    } )
                    .catch( callback );

            }

        };

    },
    '0.0.1', {
        requires: [
            'dcfilters'
        ]
    }
);
