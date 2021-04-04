/**
 *  User: pi
 *  Date: 03/08/15  15:25
 *  (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/



YUI.add( 'deviceconfiguration-api', function( Y, NAME ) {
        /**
         * @module deviceconfiguration-api
         */

        /**
         * If document exists, will update only 'update' and 'lastUpdate' fields
         * @method upsert
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query query
         * @param {Object} args.data data to update/insert
         * @param {Function} args.callback
         * @return{Function} callback
         */
        function upsert( args ) {
            var
                user = args.user,
                callback = args.callback,
                queryParams = args.query || {},
                data = args.data || {},
                patientregid = queryParams.patientregId,
                async = require( 'async' );

            if( !queryParams.patientregId && !queryParams.customerIdPrac ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 400, {message: 'patientregid or customerIdPrac should be set'} ) );
            }
            async.waterfall( [
                function( next ) {
                    if(patientregid){
                        return next(null, patientregid);
                    }
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'get',
                        model: 'patientreg',
                        query: {
                            identityId: user.identityId,
                            customerIdPrac: queryParams.customerIdPrac
                        },
                        options: {
                            lean: true,
                            limit: 1,
                            select: {
                                _id: 1
                            }
                        }
                    }, function(err, results){
                        if( err ) {
                            return next( err );
                        }
                        if(!results[0]){
                            return next( new Y.doccirrus.commonerrors.DCError(400, { message: 'Patient is not registered in this Practice, customer No: ' + queryParams.customerIdPrac}));
                        }
                        patientregid = results[0]._id.toString();
                        next( err, patientregid );
                    } );
                },
                function( patientregid, next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'get',
                        model: 'deviceconfiguration',
                        query: {
                            type: queryParams.deviceType,
                            patientregId: patientregid
                        },
                        options: {
                            lean: true,
                            limit: 1
                        }
                    }, next );
                },
                function( results, next ) {
                    var deviceData = results[0];
                    if( !deviceData ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'deviceconfiguration',
                            action: 'post',
                            data: Y.doccirrus.filters.cleanDbObject( {
                                lastUpdate: data.lastUpdate,
                                patientregId: data.patientregId || patientregid,
                                update: data.update,
                                type: data.type
                            } )
                        }, next );
                    } else {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'deviceconfiguration',
                            action: 'put',
                            fields: ['update', 'lastUpdate'],
                            data: Y.doccirrus.filters.cleanDbObject( {
                                lastUpdate: data.lastUpdate || deviceData.lastUpdate,
                                update: data.update || deviceData.update
                            } ),
                            query: {
                                patientregId: deviceData.patientregId,
                                type: deviceData.type
                            }
                        }, next );

                    }
                }
            ], callback );
        }

        /**
         * @class deviceconfiguration
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).deviceconfiguration = {
            /**
             * @property name
             * @type {String}
             * @default deviceconfiguration-api
             * @protected
             */
            name: NAME,
            upsert: function( args ) {
                Y.log('Entering Y.doccirrus.api.deviceconfiguration.upsert', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.deviceconfiguration.upsert');
                }
                upsert( args );
            }
        };

    },
    '0.0.1', {requires: []}
);